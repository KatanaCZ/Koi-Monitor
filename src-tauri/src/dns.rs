use serde::{Deserialize, Serialize};
use std::time::Instant;
use tokio::sync::Mutex;

static DNS_PING_LOCK: std::sync::LazyLock<Mutex<()>> =
    std::sync::LazyLock::new(|| Mutex::new(()));

const ALLOWED_DNS_IPS: &[&str] = &[
    "8.8.8.8",
    "8.8.4.4",
    "1.1.1.1",
    "1.0.0.1",
    "9.9.9.9",
    "149.112.112.112",
    "208.67.222.222",
    "208.67.220.220",
    "94.140.14.14",
    "94.140.15.15",
    "185.228.168.9",
    "185.228.169.9",
];

fn is_allowed_dns_ip(ip: &str) -> bool {
    ALLOWED_DNS_IPS.contains(&ip) || is_allowed_custom_dns_ip(ip)
}

fn is_allowed_custom_dns_ip(ip: &str) -> bool {
    let parts: Vec<&str> = ip.split('.').collect();
    if parts.len() != 4 {
        return false;
    }

    let mut octets = [0u8; 4];
    for (i, part) in parts.iter().enumerate() {
        if part.is_empty() || part.len() > 3 {
            return false;
        }
        if !part.chars().all(|c| c.is_ascii_digit()) {
            return false;
        }
        let n: u16 = match part.parse() {
            Ok(n) if n <= 255 => n,
            _ => return false,
        };
        octets[i] = n as u8;
    }

    let [a, b, _, _] = octets;
    if a == 0 || a == 127 {
        return false;
    }
    if a >= 224 {
        return false;
    }
    if a == 169 && b == 254 {
        return false;
    }

    true
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn custom_dns_allows_private_and_public_ipv4() {
        assert!(is_allowed_custom_dns_ip("192.168.1.1"));
        assert!(is_allowed_custom_dns_ip("10.0.0.1"));
        assert!(is_allowed_custom_dns_ip("172.16.0.1"));
        assert!(is_allowed_custom_dns_ip("81.253.149.22"));
    }

    #[test]
    fn custom_dns_rejects_loopback_link_local_and_multicast() {
        assert!(!is_allowed_custom_dns_ip("127.0.0.1"));
        assert!(!is_allowed_custom_dns_ip("169.254.1.1"));
        assert!(!is_allowed_custom_dns_ip("224.0.0.1"));
        assert!(!is_allowed_custom_dns_ip("0.0.0.0"));
        assert!(!is_allowed_custom_dns_ip("not-an-ip"));
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DnsResult {
    pub server_name: String,
    pub ip: String,
    pub latency_ms: f64,
    pub status: String,
    pub is_best: bool,
}

const DNS_CONNECT_TIMEOUT_MS: u64 = 800;

pub async fn ping_dns_server(server: &str) -> Result<f64, String> {
    let start = Instant::now();
    let addr = format!("{}:53", server);
    let timeout = tokio::time::Duration::from_millis(DNS_CONNECT_TIMEOUT_MS);

    match tokio::time::timeout(timeout, tokio::net::TcpStream::connect(&addr)).await {
        Ok(Ok(_stream)) => {
            let elapsed = start.elapsed().as_secs_f64() * 1000.0;
            Ok(elapsed)
        }
        Ok(Err(e)) => Err(format!("Connection failed: {}", e)),
        Err(_) => Err("Timeout".to_string()),
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DnsServer {
    pub name: String,
    pub ip: String,
}

pub async fn ping_all_dns_servers(
    custom_servers: Option<Vec<DnsServer>>,
) -> Result<Vec<DnsResult>, String> {
    let _lock = DNS_PING_LOCK.lock().await;

    let servers = custom_servers.unwrap_or_else(|| {
        vec![
            DnsServer {
                name: "Google DNS".to_string(),
                ip: "8.8.8.8".to_string(),
            },
            DnsServer {
                name: "Cloudflare DNS".to_string(),
                ip: "1.1.1.1".to_string(),
            },
            DnsServer {
                name: "Quad9".to_string(),
                ip: "9.9.9.9".to_string(),
            },
            DnsServer {
                name: "OpenDNS".to_string(),
                ip: "208.67.222.222".to_string(),
            },
        ]
    });

    if servers.is_empty() {
        return Ok(Vec::new());
    }

    for server in &servers {
        if !is_allowed_dns_ip(&server.ip) {
            return Err(format!("DNS IP not allowed: {}", server.ip));
        }
    }

    let mut handles = Vec::with_capacity(servers.len());
    for server in servers {
        let name = server.name.clone();
        let ip = server.ip.clone();
        handles.push(tokio::spawn(async move {
            let latency = ping_dns_server(&ip).await.unwrap_or(-1.0);
            (name, ip, latency)
        }));
    }

    let mut results = Vec::with_capacity(handles.len());
    for task in handles {
        if let Ok((name, ip, latency)) = task.await {
            let status = if latency < 0.0 {
                "Timeout".to_string()
            } else if latency < 50.0 {
                "Excellent".to_string()
            } else if latency < 100.0 {
                "Good".to_string()
            } else if latency < 200.0 {
                "Fair".to_string()
            } else {
                "Poor".to_string()
            };

            results.push(DnsResult {
                server_name: name,
                ip,
                latency_ms: latency,
                status,
                is_best: false,
            });
        }
    }

    let mut min_latency = f64::MAX;
    for result in &results {
        if result.latency_ms > 0.0 && result.latency_ms < min_latency {
            min_latency = result.latency_ms;
        }
    }

    for result in &mut results {
        if result.latency_ms > 0.0 && (result.latency_ms - min_latency).abs() < 0.001 {
            result.is_best = true;
            break;
        }
    }

    Ok(results)
}

use serde::{Deserialize, Serialize};
use std::time::Instant;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DnsResult {
    pub server_name: String,
    pub ip: String,
    pub latency_ms: f64,
    pub status: String,
    pub is_best: bool,
}

pub async fn ping_dns_server(server: &str) -> Result<f64, String> {
    let start = Instant::now();

    // Connect to port 53 (DNS) for latency measurement
    let addr = format!("{}:53", server);
    let timeout = tokio::time::Duration::from_secs(3);

    match tokio::time::timeout(timeout, tokio::net::TcpStream::connect(&addr)).await {
        Ok(Ok(_stream)) => {
            let elapsed = start.elapsed().as_secs_f64() * 1000.0;
            Ok(elapsed)
        }
        Ok(Err(e)) => Err(format!("Connection failed: {}", e)),
        Err(_) => Err("Timeout".to_string()),
    }
}

pub async fn ping_all_dns_servers() -> Result<Vec<DnsResult>, String> {
    let servers = vec![
        ("Google DNS", "8.8.8.8"),
        ("Cloudflare DNS", "1.1.1.1"),
        ("Quad9", "9.9.9.9"),
        ("OpenDNS", "208.67.222.222"),
    ];

    let mut results = Vec::new();

    for (name, ip) in servers {
        let latency = ping_dns_server(ip).await.unwrap_or(-1.0);

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
            server_name: name.to_string(),
            ip: ip.to_string(),
            latency_ms: latency,
            status,
            is_best: false,
        });
    }

    // Find best DNS
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
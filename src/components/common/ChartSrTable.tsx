import React from 'react';

export interface ChartSrColumn {
  key: string;
  label: string;
  format?: (value: number) => string;
}

interface ChartSrTableProps {
  caption: string;
  columns: ChartSrColumn[];
  rows: Record<string, number>[];
  maxRows?: number;
}

export const ChartSrTable: React.FC<ChartSrTableProps> = ({
  caption,
  columns,
  rows,
  maxRows = 12,
}) => {
  if (rows.length === 0) return null;

  const visibleRows = rows.slice(-maxRows);

  return (
    <table className="sr-only">
      <caption>{caption}</caption>
      <thead>
        <tr>
          {columns.map((col) => (
            <th key={col.key} scope="col">
              {col.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {visibleRows.map((row, index) => (
          <tr key={index}>
            {columns.map((col) => {
              const raw = row[col.key];
              const display =
                col.format && typeof raw === 'number'
                  ? col.format(raw)
                  : raw;
              return <td key={col.key}>{display}</td>;
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
};

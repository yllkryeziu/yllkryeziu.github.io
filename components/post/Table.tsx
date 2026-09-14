import React from 'react';

export interface Column {
  key: string;
  label: string;
  numeric?: boolean;
}

export type Row = Record<string, React.ReactNode> & { highlight?: boolean };

interface TableProps {
  n: number;
  caption: React.ReactNode;
  columns: Column[];
  rows: Row[];
}

const Table: React.FC<TableProps> = ({ n, caption, columns, rows }) => (
  <figure className="post-figure">
    <figcaption className="post-caption" style={{ margin: '0 0 0.85rem' }}>
      <span className="lbl">Table {n}.</span> {caption}
    </figcaption>
    <div className="post-table-wrap">
      <table className="post-table">
        <thead>
          <tr>
            {columns.map(col => (
              <th key={col.key} className={col.numeric ? 'num' : undefined}>{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={row.highlight ? 'hi' : undefined}>
              {columns.map(col => (
                <td key={col.key} className={col.numeric ? 'num' : undefined}>{row[col.key]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </figure>
);

export default Table;

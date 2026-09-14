import React from 'react';
import { Highlight, type PrismTheme } from 'prism-react-renderer';

const theme: PrismTheme = {
  plain: { color: 'var(--color-text)', backgroundColor: 'transparent' },
  styles: [
    { types: ['comment', 'prolog', 'doctype', 'cdata'], style: { color: 'var(--color-text-muted)', fontStyle: 'italic' } },
    { types: ['punctuation'], style: { color: 'var(--color-text-muted)' } },
    { types: ['string', 'char', 'attr-value', 'regex'], style: { color: 'var(--syn-string)' } },
    { types: ['number', 'boolean', 'constant', 'symbol'], style: { color: 'var(--syn-number)' } },
    { types: ['keyword', 'atrule', 'rule', 'important'], style: { color: 'var(--syn-keyword)' } },
    { types: ['builtin', 'class-name', 'maybe-class-name'], style: { color: 'var(--syn-type)' } },
    { types: ['function', 'method'], style: { color: 'var(--color-text)', fontWeight: '600' } },
    { types: ['operator', 'entity', 'url'], style: { color: 'var(--color-text-subtle)' } },
    { types: ['property', 'attr-name', 'variable'], style: { color: 'var(--syn-name)' } },
    { types: ['macro'], style: { color: 'var(--syn-number)' } },
    { types: ['deleted'], style: { color: 'var(--color-accent)' } },
    { types: ['inserted'], style: { color: 'var(--syn-string)' } },
  ],
};

interface CodeProps {
  language: string;
  file?: string;
  note?: string;
  children: string;
}

const Code: React.FC<CodeProps> = ({ language, file, note, children }) => (
  <div className="post-code">
    {(file || note) && (
      <div className="post-code-bar">
        <span className="lang">{language}</span>
        {file && <span>{file}</span>}
        {note && <span style={{ marginLeft: 'auto', opacity: 0.8 }}>{note}</span>}
      </div>
    )}
    <Highlight code={children.trim()} language={language} theme={theme}>
      {({ tokens, getLineProps, getTokenProps }) => (
        <pre>
          {tokens.map((line, i) => (
            <div key={i} {...getLineProps({ line })}>
              {line.map((token, j) => (
                <span key={j} {...getTokenProps({ token })} />
              ))}
            </div>
          ))}
        </pre>
      )}
    </Highlight>
  </div>
);

export default Code;

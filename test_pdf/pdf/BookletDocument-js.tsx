import * as React from 'react';

// Re-export the existing JS template. We `require` the CommonJS file and then
// wrap it into a default-exported React component so TS projects can import it
// with proper module semantics.
const BookletDocumentCommon = require('./BookletDocument');

export default function BookletDocument(props: any) {
  // the JS module exports a function that returns a Document; simply call it
  return React.createElement(BookletDocumentCommon, props);
}

// also provide named export for interop
module.exports = BookletDocumentCommon;

declare module 'punycode/' {
  const punycode: {
    toASCII(input: string): string
    toUnicode(input: string): string
  }

  export default punycode
}

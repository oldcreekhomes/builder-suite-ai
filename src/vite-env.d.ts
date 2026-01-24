/// <reference types="vite/client" />

// Support for Vite's ?url import suffix
declare module '*?url' {
  const src: string;
  export default src;
}

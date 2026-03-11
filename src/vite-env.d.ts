/// <reference types="vite/client" />
/// <reference path="../node_modules/@types/google.maps/index.d.ts" />

// Support for Vite's ?url import suffix
declare module '*?url' {
  const src: string;
  export default src;
}

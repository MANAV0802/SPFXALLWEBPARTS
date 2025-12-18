import * as L from "leaflet";

// Augment the global L namespace so L.Routing is recognized by TypeScript
declare global {
  namespace L {
    namespace Routing {
      function control(options: any): any;
      function osrmv1(options?: any): any;
    }
  }
}

export {};

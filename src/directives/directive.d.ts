import type { Directive } from "vue";

declare module "vue" {
  export interface GlobalDirectives {
    tooltip: Directive;
  }
}

export {};

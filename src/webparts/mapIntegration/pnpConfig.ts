import { spfi, SPFx } from "@pnp/sp";

// Import only once (optional but recommended)
import "@pnp/sp/webs";
import "@pnp/sp/lists";
import "@pnp/sp/items";
import "@pnp/sp/files";
import "@pnp/sp/folders";
import "@pnp/sp/site-users/web";

let _sp: ReturnType<typeof spfi> | null = null;

/**
 * Initialize PnP JS with SPFx context.
 * MUST be called once inside each WebPart's onInit().
 */
export const initSP = (context: any): void => {
  if (!_sp) {
    console.log("🔵 PnP JS Initialized with SPFx context");
    _sp = spfi().using(SPFx(context));
  }
};

/**
 * Returns the PnP SP instance to be used inside components.
 */
export const getSP = () => {
  if (!_sp) {
    throw new Error(
      "❌ PnP not initialized. Call initSP(context) in your WebPart."
    );
  }
  return _sp;
};

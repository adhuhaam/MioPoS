import { Router } from "express";
import { requireAuth, requireRole } from "../lib/session";
import { getDefaultCurrency, setAppSetting, SETTINGS_KEYS } from "../lib/app-settings";

const router = Router();

/** System-wide defaults (super admin). */
router.get("/settings/system", requireAuth, async (_req, res) => {
  try {
    const defaultCurrency = await getDefaultCurrency();
    return res.json({ defaultCurrency });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/settings/system", requireRole("super_admin"), async (req, res) => {
  try {
    const { defaultCurrency } = req.body as { defaultCurrency?: string };
    if (!defaultCurrency || typeof defaultCurrency !== "string" || defaultCurrency.length < 3 || defaultCurrency.length > 8) {
      return res.status(400).json({ error: "defaultCurrency must be a valid ISO code (e.g. MVR, USD)" });
    }
    const code = defaultCurrency.trim().toUpperCase();
    await setAppSetting(SETTINGS_KEYS.defaultCurrency, code);
    return res.json({ defaultCurrency: code });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

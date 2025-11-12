// Em desenvolvimento, pegamos o tenant pelo header.
// Em produção, você valida JWT do Supabase aqui.

export function resolveTenant(req, _res, next) {
  const t = req.header("x-tenant-id");
  if (!t) {
    req.headers["x-tenant-id"] = "tenant_demo"; // fallback
  }
  next();
}

export function getInstanceId(req) {
  const tenant = (req.header("x-tenant-id") || "tenant_demo").toLowerCase();
  return `inst_${tenant}`;
}

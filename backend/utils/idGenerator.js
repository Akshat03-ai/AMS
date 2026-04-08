function generateAuditId() {
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `AUD-${date}-${random}`;
}

function generateAssetId() {
  const random = Math.random().toString(36).substring(2, 4).toUpperCase();
  const timestamp = Date.now().toString(36).toUpperCase().slice(-2);
  return `AST-${timestamp}${random}`;
}

module.exports = { generateAuditId, generateAssetId };

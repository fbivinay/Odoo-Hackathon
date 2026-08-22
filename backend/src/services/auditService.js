async function recordAudit(tx, { actorId, action, entity, entityId, meta }) {
  return tx.auditLog.create({
    data: { actorId, action, entity, entityId, meta },
  });
}

module.exports = { recordAudit };

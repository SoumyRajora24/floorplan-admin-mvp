// Middleware to parse JSON strings and numbers in FormData
exports.parseFormData = (req, res, next) => {
  // If body contains stringified JSON fields, parse them
  if (req.body) {
    const jsonFieldsToParse = ['initialData', 'changes', 'resolvedSnapshot'];
    const numberFieldsToParse = ['floorNumber'];
    
    // Parse JSON string fields
    jsonFieldsToParse.forEach(field => {
      if (req.body[field] && typeof req.body[field] === 'string') {
        try {
          req.body[field] = JSON.parse(req.body[field]);
        } catch (e) {
          // If parsing fails, leave it as is (validation will catch it)
        }
      }
    });
    
    // Parse number fields
    numberFieldsToParse.forEach(field => {
      if (req.body[field] && typeof req.body[field] === 'string') {
        const parsed = Number(req.body[field]);
        if (!isNaN(parsed)) {
          req.body[field] = parsed;
        }
      }
    });
  }
  
  next();
};


exports.DATABASE_URL = process.env.DATABASE_URL ||
                       global.DATABASE_URL ||
                      'mongodb://localhost/yodots';
exports.PORT = process.env.PORT || 3000;
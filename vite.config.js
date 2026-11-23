export default {
    server: {
        proxy: { '/api': 'http://127.0.0.1:8000' },
        fs: { deny: ['**/.env', '**/.env.*', '**/*.db', '**/*.sqlite', '**/*.db-*', '**/server/**', '**/database/**'] }
    }
};

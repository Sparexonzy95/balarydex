module.exports = {
  apps: [
    {
      name: 'balary-indexer',
      script: 'indexer.cjs',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        BACKEND_PORT: 3102,
        BACKEND_HOST: '0.0.0.0',
        STORAGE_DIR: './storage',
        LITEFORGE_RPC_URL: 'https://liteforge.rpc.caldera.xyz/http'
      }
    }
  ]
};

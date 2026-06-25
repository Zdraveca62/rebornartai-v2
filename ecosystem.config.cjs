module.exports = {
  apps: [{
    name: 'rebornartai',
    script: '/usr/bin/node',
    args: '/var/www/rebornartai-v2/node_modules/.bin/next start',
    cwd: '/var/www/rebornartai-v2',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
}

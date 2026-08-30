const path = require('path');

module.exports = {
  apps: [
    {
      name: 'theme',
      cwd: path.join(__dirname, 'theme'),
      script: 'npm',
      args: 'run start',
      env: {
        PORT: 3000,
      },
    },
    {
      name: 'apis',
      cwd: path.join(__dirname, 'apis'),
      script: 'app.js',
      env: {
        PORT: 4000,
      },
    },
    {
      name: 'admin',
      cwd: path.join(__dirname, 'admin'),
      script: '/usr/bin/serve',
      args: '-s build -p 3001',
      interpreter: 'none',
    },
    {
      name: 'distributer',
      cwd: path.join(__dirname, 'distributer'),
      script: '/usr/bin/serve',
      args: '-s build -p 3002',
      interpreter: 'none',
    },
    {
      name: 'franchise',
      cwd: path.join(__dirname, 'franchise'),
      script: '/usr/bin/serve',
      args: '-s build -p 3003',
      interpreter: 'none',
    },
  ],
};

'use strict';

/**
 * Interactive script to create the first admin account.
 * Usage:
 *   npm run init-admin
 *   npm run init-admin -- admin@store.com "Store Admin" mypassword
 */

const readline = require('readline');
const { db, logActivity } = require('../db');
const auth = require('../auth');

function ask(question, { silent = false } = {}) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    if (silent) {
      const stdoutWrite = process.stdout.write.bind(process.stdout);
      rl._writeToOutput = () => stdoutWrite('*');
    }
    rl.question(question, (answer) => {
      rl.close();
      if (silent) process.stdout.write('\n');
      resolve(answer.trim());
    });
  });
}

async function main() {
  const [argEmail, argName, argPassword] = process.argv.slice(2);

  const email = (argEmail || (await ask('管理员邮箱 / Admin email: '))).toLowerCase();
  const name = argName || (await ask('姓名 / Name: '));
  const password = argPassword || (await ask('密码 / Password: ', { silent: true }));

  if (!email || !name || !password) {
    console.error('邮箱、姓名、密码均必填 / Email, name and password are required.');
    process.exit(1);
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    db.prepare('UPDATE users SET name = ?, password_hash = ?, role = ?, active = 1 WHERE email = ?').run(
      name,
      auth.hashPassword(password),
      'admin',
      email
    );
    console.log(`已更新管理员 / Updated admin: ${email}`);
  } else {
    db.prepare('INSERT INTO users (email, name, password_hash, role) VALUES (?,?,?,?)').run(
      email,
      name,
      auth.hashPassword(password),
      'admin'
    );
    console.log(`已创建管理员 / Created admin: ${email}`);
  }
  logActivity({ id: null, name: 'system' }, 'admin.bootstrap', email);
  process.exit(0);
}

main();

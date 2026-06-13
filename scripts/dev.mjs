import { spawn } from 'node:child_process';

const isWindows = process.platform === 'win32';
const npmCommand = isWindows ? 'npm.cmd' : 'npm';

const processes = [
  ['server', ['run', 'dev', '--prefix', 'server']],
  ['client', ['run', 'dev', '--prefix', 'client']]
];

for (const [name, args] of processes) {
  const child = spawn(npmCommand, args, {
    stdio: 'inherit',
    shell: false
  });

  child.on('exit', (code) => {
    if (code && code !== 0) {
      console.error(`${name} exited with code ${code}`);
      process.exitCode = code;
    }
  });
}

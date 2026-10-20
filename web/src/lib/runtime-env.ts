// Reads runtime settings from Node environment variables during local development.
export function runtimeSetting(name: string) {
  return process.env[name];
}

// Prevents the native Sharp package from entering Workers; cloud uploads use browser canvas output.
export default function unavailableSharp() {
  throw new Error('Sharp is available only in the local Node admin runtime.');
}

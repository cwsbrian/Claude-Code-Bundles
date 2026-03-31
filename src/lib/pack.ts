export type PackOptions = {
  manifestPath: string;
  outArchivePath: string;
};

export async function pack(_options: PackOptions): Promise<void> {
  throw new Error("pack is not implemented yet");
}

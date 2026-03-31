export type UnpackOptions = {
  archivePath: string;
  outDir: string;
};

export async function unpack(_options: UnpackOptions): Promise<void> {
  throw new Error("unpack is not implemented yet");
}

/**
 * MinerU JSON output shapes — extend when wiring real parser output.
 * See: https://github.com/opendatalab/MinerU
 */
export type MinerUParserMode = "http" | "off";

export type MinerUJobEnvelope = {
  jobId: string;
  userId: string;
  documentId: string;
  signedInputUrl: string;
  outputBasePath: string;
};

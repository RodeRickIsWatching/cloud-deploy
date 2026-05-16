import type { DeploymentHashes } from "@/types/deploy";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { shortHash } from "@/utils/format-utils";

type PayloadReviewPanelProps = {
  hashes: DeploymentHashes;
  payload: unknown;
  onCopy: () => void;
  onDownload: () => void;
};

const hashLabels: Array<[keyof DeploymentHashes, string]> = [
  ["sourceHash", "sourceHash"],
  ["artifactHash", "artifactHash"],
  ["constructorInputHash", "constructorInputHash"],
  ["signedPayloadHash", "signedPayloadHash"]
];

export function PayloadReviewPanel({ hashes, payload, onCopy, onDownload }: PayloadReviewPanelProps) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        {hashLabels
          .filter(([key]) => hashes[key])
          .map(([key, label]) => (
            <div key={key} className="rounded-md border bg-card p-3">
              <p className="text-caption text-muted-foreground">{label}</p>
              <p className="font-mono text-sm">{shortHash(hashes[key])}</p>
            </div>
          ))}
      </div>
      <ScrollArea className="h-64 w-full max-w-full rounded-md border bg-card">
        <div data-json-scroll-content="true" className="w-full max-w-full overflow-x-auto p-4">
          <pre className="w-max min-w-full whitespace-pre text-sm">{JSON.stringify(payload, null, 2)}</pre>
        </div>
      </ScrollArea>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCopy}>
          Copy JSON
        </Button>
        <Button type="button" onClick={onDownload}>
          Download JSON
        </Button>
      </div>
    </div>
  );
}

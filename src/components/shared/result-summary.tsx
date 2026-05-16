import { useState, type ReactNode } from "react";
import { CheckCircle2, Copy, Loader2 } from "lucide-react";
import type { DeployResult } from "@/types/deploy";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatStatus, shortHash } from "@/utils/format-utils";

type ResultSummaryProps = {
  result: DeployResult | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function getDeployDetails(raw: unknown) {
  if (!isRecord(raw)) {
    return null;
  }

  const transaction = isRecord(raw.transaction) ? raw.transaction : null;
  const submittedTransaction = isRecord(raw.submittedTransaction) ? raw.submittedTransaction : {};
  const chainId = typeof raw.chainId === "number" || typeof raw.chainId === "string" ? String(raw.chainId) : undefined;
  const transactionHash = stringValue(raw.transactionHash) ?? stringValue(transaction?.hash);

  return {
    transactionHash,
    chainId,
    from: stringValue(transaction?.from) ?? stringValue(submittedTransaction.from),
    to: stringValue(transaction?.to) ?? stringValue(submittedTransaction.to) ?? stringValue(raw.contractAddress),
    calldata: stringValue(transaction?.input) ?? stringValue(transaction?.data) ?? stringValue(submittedTransaction.calldata) ?? stringValue(raw.data),
    method: stringValue(raw.method),
    deployAbi: raw.deployAbi,
    transactionLookupError: stringValue(raw.transactionLookupError),
    transactionLookupPending: raw.transactionLookupPending === true || Boolean(transactionHash && !transaction),
    transactionFound: Boolean(transaction)
  };
}

function DetailItem({ label, value, children }: { label: string; value?: string; children?: ReactNode }) {
  if (!value && !children) {
    return null;
  }

  return (
    <div className="space-y-1 rounded-md bg-muted p-3">
      <p className="text-caption text-muted-foreground">{label}</p>
      {children ?? <p className="break-all font-mono text-sm">{value}</p>}
    </div>
  );
}

function TransactionHashItem({
  value,
  pending,
  found
}: {
  value?: string;
  pending: boolean;
  found: boolean;
}) {
  if (!value) {
    return null;
  }

  return (
    <DetailItem label="Transaction Hash">
      <div className="flex items-start gap-2">
        {found ? <CheckCircle2 aria-label="Transaction found" className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> : null}
        {!found && pending ? <Loader2 aria-label="Transaction lookup pending" className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-muted-foreground" /> : null}
        <p className="break-all font-mono text-sm">{value}</p>
      </div>
    </DetailItem>
  );
}

const calldataPreviewLength = 160;

function CalldataItem({ value }: { value?: string }) {
  const [expanded, setExpanded] = useState(false);

  if (!value) {
    return null;
  }

  const isLong = value.length > calldataPreviewLength;
  const displayValue = !expanded && isLong ? `${value.slice(0, calldataPreviewLength)}...` : value;

  return (
    <DetailItem label="Calldata">
      <div className="space-y-2">
        {expanded && isLong ? (
          <ScrollArea className="max-h-48 w-full max-w-full rounded-md border bg-background">
            <div data-calldata-scroll-content="true" className="w-full max-w-full overflow-x-auto p-3">
              <pre className="w-max min-w-full whitespace-pre text-sm">{displayValue}</pre>
            </div>
          </ScrollArea>
        ) : (
          <p className="break-all font-mono text-sm">{displayValue}</p>
        )}
        {isLong ? (
          <Button type="button" variant="outline" size="sm" onClick={() => setExpanded((current) => !current)}>
            {expanded ? "Collapse Calldata" : "Expand Calldata"}
          </Button>
        ) : null}
      </div>
    </DetailItem>
  );
}

export function ResultSummary({ result }: ResultSummaryProps) {
  if (!result) {
    return <p className="text-sm text-muted-foreground">No deployment result yet.</p>;
  }

  const deployDetails = getDeployDetails(result.raw);
  const deployAbiJson = deployDetails?.deployAbi ? JSON.stringify(deployDetails.deployAbi, null, 2) : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Badge>{formatStatus(result.status)}</Badge>
        {result.transactionHash ? <Badge variant="outline">{shortHash(result.transactionHash)}</Badge> : null}
        {result.lyquidId ? <Badge variant="outline">{result.lyquidId}</Badge> : null}
        {result.signedPayloadHash ? <Badge variant="outline">{shortHash(result.signedPayloadHash)}</Badge> : null}
      </div>
      <ScrollArea className="h-48 w-full max-w-full rounded-md border bg-card">
        <div data-json-scroll-content="true" className="w-full max-w-full overflow-x-auto p-4">
          <pre className="w-max min-w-full whitespace-pre text-sm">{JSON.stringify(result.raw, null, 2)}</pre>
        </div>
      </ScrollArea>
      {deployDetails ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <section className={deployAbiJson ? "space-y-4 rounded-md border bg-card p-4" : "space-y-4 rounded-md border bg-card p-4 lg:col-span-2"}>
            <div>
              <h2 className="text-base font-semibold">Transaction Details</h2>
              <p className="text-sm text-muted-foreground">Details captured from the submitted deploy transaction and the configured RPC.</p>
            </div>
            <div className="grid gap-3">
              <TransactionHashItem value={deployDetails.transactionHash} pending={deployDetails.transactionLookupPending} found={deployDetails.transactionFound} />
              <DetailItem label="Chain ID" value={deployDetails.chainId} />
              <DetailItem label="From" value={deployDetails.from} />
              <DetailItem label="To" value={deployDetails.to} />
              <DetailItem label="Method" value={deployDetails.method} />
              <CalldataItem value={deployDetails.calldata} />
            </div>
            {deployDetails.transactionLookupError ? (
              <p className="rounded-md border border-destructive bg-background p-3 text-sm text-destructive">{deployDetails.transactionLookupError}</p>
            ) : null}
          </section>
          {deployAbiJson ? (
            <section className="space-y-4 rounded-md border bg-card p-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-semibold">Deploy ABI</h2>
                <Button type="button" variant="outline" size="sm" onClick={() => navigator.clipboard?.writeText(deployAbiJson)}>
                  <Copy />
                  Copy ABI
                </Button>
              </div>
              <ScrollArea className="h-64 w-full max-w-full rounded-md border bg-background">
                <div className="w-full max-w-full overflow-x-auto p-4">
                  <pre className="w-max min-w-full whitespace-pre text-sm">{deployAbiJson}</pre>
                </div>
              </ScrollArea>
            </section>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

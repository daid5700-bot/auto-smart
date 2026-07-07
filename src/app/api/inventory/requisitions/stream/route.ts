export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { getActiveBranchId } from "@/lib/branch";
import {
  getPendingRequisitionCount,
  onRequisitionCountChanged,
} from "@/lib/requisition-events";

const encoder = new TextEncoder();

function encodeMessage(count: number) {
  return encoder.encode(`event: count\ndata: ${JSON.stringify({ count })}\n\n`);
}

export async function GET(req: Request) {
  const branchId = getActiveBranchId();
  if (!branchId) {
    return new Response("Không xác định được chi nhánh hiện tại", { status: 400 });
  }

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;

      const sendCount = async () => {
        if (closed) return;
        try {
          const count = await getPendingRequisitionCount(branchId);
          controller.enqueue(encodeMessage(count));
        } catch (error: any) {
          controller.enqueue(
            encoder.encode(`event: error\ndata: ${JSON.stringify({ error: error.message })}\n\n`)
          );
        }
      };

      const unsubscribe = onRequisitionCountChanged((payload) => {
        if (payload.branchId === branchId) {
          void sendCount();
        }
      });

      const heartbeat = setInterval(() => {
        if (!closed) controller.enqueue(encoder.encode(": heartbeat\n\n"));
      }, 30000);

      req.signal.addEventListener("abort", () => {
        closed = true;
        clearInterval(heartbeat);
        unsubscribe();
        controller.close();
      });

      await sendCount();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { WebSocketServer, WebSocket } from "ws";
import { onRequisitionCountChanged, getPendingRequisitionCount } from "@/lib/requisition-events";

// Use global to persist WebSocket Server during development hot-reloads
const globalForWs = globalThis as typeof globalThis & {
  wss?: WebSocketServer;
};

export async function GET(req: NextRequest) {
  try {
    if (!globalForWs.wss) {
      console.log("Starting WebSocket server on port 3001...");
      const wss = new WebSocketServer({ port: 3001 });

      wss.on("error", (err) => {
        console.error("WebSocket Server Error:", err);
      });

      wss.on("connection", (ws: WebSocket) => {
        console.log("WS Client connected");

        let currentBranchId: number | null = null;
        let unsubscribe: (() => void) | null = null;

        ws.on("message", async (message: string) => {
          try {
            const data = JSON.parse(message.toString());
            if (data.type === "subscribe" && data.branchId) {
              currentBranchId = Number(data.branchId);
              
              if (unsubscribe) {
                unsubscribe();
              }

              // Send initial count
              const count = await getPendingRequisitionCount(currentBranchId);
              ws.send(JSON.stringify({ type: "count", count }));

              // Listen to event changes and push updates to the socket client
              unsubscribe = onRequisitionCountChanged(async (payload) => {
                if (payload.branchId === currentBranchId) {
                  const updatedCount = await getPendingRequisitionCount(currentBranchId);
                  if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({ type: "count", count: updatedCount }));
                  }
                }
              });
            }
          } catch (error) {
            console.error("WS Message Error:", error);
          }
        });

        ws.on("close", () => {
          console.log("WS Client disconnected");
          if (unsubscribe) {
            unsubscribe();
          }
        });

        ws.on("error", (err) => {
          console.error("WS Client connection error:", err);
          if (unsubscribe) {
            unsubscribe();
          }
        });
      });

      globalForWs.wss = wss;
    }

    return NextResponse.json({ success: true, message: "WebSocket server running on port 3001" });
  } catch (error: any) {
    console.error("Failed to initialize WebSocket Server:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

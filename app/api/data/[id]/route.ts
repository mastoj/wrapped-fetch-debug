import { NextRequest, NextResponse } from "next/server";

export const GET = async (req: NextRequest) => {
  const path = req.nextUrl.pathname;
  console.log("==> Getting some data: ", path);
  return NextResponse.json({ hello: "world", path });
};

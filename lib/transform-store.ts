import { sql } from "./db";

export type WarpletTransformRecord = {
  fid: number;
  cid: string;
  gatewayUrl: string;
  imageUrl: string | null;
  createdAt: Date;
};

type WarpletTransformRow = {
  fid: number;
  cid: string;
  gateway_url: string;
  image_url: string | null;
  created_at: string;
};

function mapRow(row: WarpletTransformRow): WarpletTransformRecord {
  return {
    fid: Number(row.fid),
    cid: row.cid,
    gatewayUrl: row.gateway_url,
    imageUrl: row.image_url ?? null,
    createdAt: new Date(row.created_at),
  };
}

export async function getWarpletTransform(
  fid: number
): Promise<WarpletTransformRecord | null> {
  const rows = (await sql`
    SELECT fid, cid, gateway_url, image_url, created_at
    FROM clawplet_warplets
    WHERE fid = ${fid}
    LIMIT 1
  `) as WarpletTransformRow[];

  if (!rows || rows.length === 0) {
    return null;
  }
  return mapRow(rows[0]);
}

export async function insertWarpletTransform(params: {
  fid: number;
  cid: string;
  gatewayUrl: string;
  imageUrl?: string | null;
}): Promise<WarpletTransformRecord> {
  const rows = (await sql`
    INSERT INTO clawplet_warplets (fid, cid, gateway_url, image_url)
    VALUES (${params.fid}, ${params.cid}, ${params.gatewayUrl}, ${
    params.imageUrl ?? null
  })
    ON CONFLICT (fid) DO NOTHING
    RETURNING fid, cid, gateway_url, image_url, created_at
  `) as WarpletTransformRow[];

  if (rows.length === 0) {
    throw new Error("Transform already exists for this fid");
  }

  return mapRow(rows[0]);
}


import { NextResponse } from "next/server";
import { pool } from "../../../../../utils/db";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ deckId: string }> }
) {
    try {
        const { deckId } = await params;


        if (!deckId) {
            return NextResponse.json(
                {
                    error: 'Missing deck id',
                },
                {
                    status: 400,
                })
        }

        const client = await pool.connect();

        const result = await client.query(`
            SELECT * FROM decks 
            WHERE id = $1
        `, [deckId]);

        client.release();

        return NextResponse.json({
            ok: true,
            data: result.rows[0],
        })
    } catch (error) {
        return NextResponse.json(
            {
                error: 'Internal server error.'
            },
            {
                status: 500
            }
        )
    }
}

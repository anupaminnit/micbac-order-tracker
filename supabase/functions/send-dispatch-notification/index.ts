// Sends the Freightysh dispatch-readiness notification when an owner dispatches an order.
// Runs server-side (not in the browser) because it needs the Resend API key, which must never
// reach the client bundle — the same reasoning that drove moving auth off the client in an
// earlier phase of this project.
import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const TO = ['info@freightysh.in', 'ops@freightysh.in']
const CC = ['nilesh@micbacindia.com']
const FROM = 'MICBAC Dispatch <notifications@orders.micbacindia.com>'

function currency(n: number | null) {
  return n == null ? '—' : `$${Number(n).toLocaleString()}`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Scoped to the caller's own JWT — relies on existing RLS (profiles self-read,
    // orders authenticated-read) rather than a service-role bypass.
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    })

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, username')
      .eq('id', user.id)
      .single()
    if (profileError || profile?.role !== 'owner') {
      return new Response(JSON.stringify({ error: 'Only owner can trigger dispatch notifications' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { orderId } = await req.json()
    if (!orderId) {
      return new Response(JSON.stringify({ error: 'orderId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: order, error: orderError } = await supabase.from('orders').select('*').eq('id', orderId).single()
    if (orderError || !order) {
      return new Response(JSON.stringify({ error: 'Order not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    if (!resendApiKey) {
      return new Response(JSON.stringify({ error: 'RESEND_API_KEY not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const subject = `Ready for Dispatch — ${order.item} (${order.po_number || order.id})`
    const html = `
      <p>Hi team,</p>
      <p>The following order is ready for dispatch from MICBAC INDIA. Please create a booking and share the booking copy with the MICBAC team.</p>
      <table cellpadding="6" style="border-collapse:collapse;font-family:sans-serif;font-size:14px;">
        <tr><td><strong>Item</strong></td><td>${order.item}</td></tr>
        <tr><td><strong>PO Number</strong></td><td>${order.po_number || '—'}</td></tr>
        <tr><td><strong>Customer</strong></td><td>${order.customer}</td></tr>
        <tr><td><strong>Quantity</strong></td><td>${order.quantity.toLocaleString()} kg</td></tr>
        <tr><td><strong>Order Value</strong></td><td>${currency(order.order_value)}</td></tr>
        <tr><td><strong>Packing Type</strong></td><td>${order.packing_type || '—'}</td></tr>
        <tr><td><strong>Delivery Address</strong></td><td>${order.delivery_address || '—'}</td></tr>
        <tr><td><strong>Readiness Date</strong></td><td>${order.readiness_date}</td></tr>
        ${order.notes ? `<tr><td><strong>Notes</strong></td><td>${order.notes}</td></tr>` : ''}
      </table>
      <p>— Sent automatically by the MICBAC Order Tracker on dispatch, triggered by ${profile.username}.</p>
    `

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: FROM, to: TO, cc: CC, subject, html }),
    })

    if (!resendRes.ok) {
      const errText = await resendRes.text()
      return new Response(JSON.stringify({ error: `Resend API error: ${errText}` }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ sent: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.40.0";

// Initialize Supabase client
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Twilio credentials from environment
const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
const twilioPhoneNumber = Deno.env.get("TWILIO_PHONE_NUMBER");

/**
 * Send SMS via Twilio
 */
async function sendViaTwilio(toPhone: string, messageContent: string): Promise<{ sid?: string; error?: string }> {
  if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
    return {
      error: "Twilio credentials not configured",
    };
  }

  const auth = btoa(`${twilioAccountSid}:${twilioAuthToken}`);
  const url = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;

  try {
    const formData = new URLSearchParams();
    formData.append("From", twilioPhoneNumber);
    formData.append("To", toPhone);
    formData.append("Body", messageContent);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { error: `Twilio API error: ${response.status}` };
    }

    const data = await response.json() as { sid: string };
    return { sid: data.sid };
  } catch (error) {
    return { error: String(error) };
  }
}

/**
 * Send scheduled reminders for upcoming appointments
 */
async function sendScheduledReminders(reminderHours: number, reminderType: string) {
  try {
    // Calculate time window
    const now = new Date();
    const reminderTime = new Date(now.getTime() + reminderHours * 60 * 60 * 1000);

    // Get day and time in the target window
    const dayString = reminderTime.toISOString().split("T")[0];
    const hourStart = reminderTime.getHours();
    const hourEnd = (hourStart + 1) % 24;

    console.log(`Looking for appointments on ${dayString} around ${hourStart}:00 UTC`);

    // Fetch appointments within the reminder window
    const { data: appointments, error: fetchError } = await supabase
      .from("appointments")
      .select(`
        id,
        appointment_date,
        appointment_time,
        status,
        patient_id,
        doctor_id,
        department,
        patients (id, first_name, last_name, phone),
        user_roles!doctor_id (full_name)
      `)
      .eq("appointment_date", dayString)
      .eq("status", "confirmed")
      .gt("appointment_time", `${hourStart}:00:00`)
      .lt("appointment_time", `${hourEnd}:59:59`);

    if (fetchError) {
      console.error("Error fetching appointments:", fetchError);
      return { success: false, error: fetchError.message };
    }

    console.log(`Found ${appointments?.length || 0} appointments for reminder`);

    if (!appointments || appointments.length === 0) {
      return { success: true, reminders_sent: 0 };
    }

    let remindersSent = 0;
    let remindersFaild = 0;

    // Send reminders for each appointment
    for (const apt of appointments) {
      try {
        const patientPhone = apt.patients?.phone;
        const patientName = apt.patients ? `${apt.patients.first_name} ${apt.patients.last_name}` : "Patient";
        const doctorName = apt.user_roles?.full_name || "Doctor";

        if (!patientPhone) {
          console.warn(`No phone number for patient in appointment ${apt.id}`);
          remindersFaild++;
          continue;
        }

        // Generate reminder message
        const reminderMessages: { [key: string]: string } = {
          reminder_24h: `Reminder: Your appointment with Dr. ${doctorName} is tomorrow at ${apt.appointment_time}. Reply STOP to unsubscribe.`,
          reminder_1h: `Reminder: Your appointment with Dr. ${doctorName} is in 1 hour at ${apt.appointment_time}. Please arrive 10 minutes early.`,
        };

        const messageContent = reminderMessages[reminderType] || reminderMessages.reminder_24h;

        // Check if reminder was already sent
        const { data: existingLog } = await supabase
          .from("appointment_sms_logs")
          .select("id")
          .eq("appointment_id", apt.id)
          .eq("message_type", reminderType)
          .eq("status", "sent")
          .single();

        if (existingLog) {
          console.log(`Reminder already sent for appointment ${apt.id}`);
          continue;
        }

        // Send via Twilio
        const twilioResult = await sendViaTwilio(patientPhone, messageContent);

        // Log attempt
        const { error: logError } = await supabase.from("appointment_sms_logs").insert({
          appointment_id: apt.id,
          patient_id: apt.patient_id,
          phone_number: patientPhone,
          message_type: reminderType,
          message_content: messageContent,
          twilio_message_sid: twilioResult.sid || null,
          status: twilioResult.error ? "failed" : "sent",
          error_message: twilioResult.error || null,
          sent_at: twilioResult.error ? null : new Date().toISOString(),
        });

        if (logError) {
          console.error(`Failed to log reminder for appointment ${apt.id}:`, logError);
          remindersFaild++;
        } else {
          remindersSent++;
          console.log(`Reminder sent to ${patientPhone} for appointment ${apt.id}`);
        }
      } catch (error) {
        console.error(`Error sending reminder for appointment ${apt.id}:`, error);
        remindersFaild++;
      }
    }

    return {
      success: true,
      reminders_sent: remindersSent,
      reminders_failed: remindersFaild,
    };
  } catch (error) {
    console.error("Error in sendScheduledReminders:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * Main handler - triggered by cron or manual call
 */
Deno.serve(async (req: Request) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, GET",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  try {
    // Support both GET (for cron) and POST
    let reminderHours = 24;
    let reminderType = "reminder_24h";

    if (req.method === "POST") {
      const body = await req.json() as { reminder_hours?: number; reminder_type?: string };
      reminderHours = body.reminder_hours || 24;
      reminderType = body.reminder_type || "reminder_24h";
    } else if (req.method === "GET") {
      const url = new URL(req.url);
      reminderHours = parseInt(url.searchParams.get("hours") || "24", 10);
      reminderType = url.searchParams.get("type") || "reminder_24h";
    }

    console.log(`Processing ${reminderType} reminders (${reminderHours} hours ahead)`);

    const result = await sendScheduledReminders(reminderHours, reminderType);

    return new Response(JSON.stringify(result), {
      status: result.success ? 200 : 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("Error in schedule-appointment-reminders function:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: String(error),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});

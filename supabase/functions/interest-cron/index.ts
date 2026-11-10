import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function roundToTwo(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

function getKolkataDateString(d: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(d);
}

function getPreviousDayString(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

function getLastDayOfMonth(yearMonth: string): string {
  const [year, month] = yearMonth.split('-').map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
}

function getInterestDescription(yearMonth: string): string {
  const [year, month] = yearMonth.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, 1));
  const monthName = date.toLocaleString('en-US', { month: 'long', timeZone: 'UTC' });
  return `${monthName} savings interest`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = new Date();
  let trigger = 'cron';

  try {
    if (req.headers.get('content-type')?.includes('application/json')) {
      const body = await req.json().catch(() => ({}));
      if (body.trigger) trigger = body.trigger;
    }
  } catch {
    // default to cron
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://vobkfalffhihixfmaezo.supabase.co';
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const todayKolkata = getKolkataDateString();
    const yesterdayKolkata = getPreviousDayString(todayKolkata);

    // 1. Fetch interest rates
    const { data: rates, error: ratesError } = await supabase
      .from('interest_rates')
      .select('*')
      .order('effective_from_date', { ascending: false });

    if (ratesError || !rates || rates.length === 0) {
      throw new Error(`Failed to fetch interest rates: ${ratesError?.message || 'No rates found'}`);
    }

    // 2. Fetch distinct users
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('id');

    if (usersError || !users) {
      throw new Error(`Failed to fetch users: ${usersError?.message}`);
    }

    let totalDaysProcessed = 0;

    for (const user of users) {
      const userId = user.id;

      // Rate for yesterday
      const applicableRate = rates.find(r => r.effective_from_date <= yesterdayKolkata) || rates[rates.length - 1];
      const ratePercent = Number(applicableRate.annual_rate_percent);

      // Compute yesterday's closing balance across all Slice bank transactions up to yesterday
      // Excluding current month's auto-interest
      const yesterdayMonth = yesterdayKolkata.slice(0, 7);

      const [incomesRes, expensesRes] = await Promise.all([
        supabase
          .from('user_income')
          .select('amount, date, is_auto_interest')
          .eq('user_id', userId)
          .lte('date', yesterdayKolkata),
        supabase
          .from('user_expenses')
          .select('amount, date')
          .eq('user_id', userId)
          .lte('date', yesterdayKolkata),
      ]);

      const incomeList = incomesRes.data || [];
      const expenseList = expensesRes.data || [];

      // Filter out auto-interest entries of the current month being calculated
      const totalIncome = incomeList
        .filter(inc => !(inc.is_auto_interest && inc.date.slice(0, 7) === yesterdayMonth))
        .reduce((sum, inc) => sum + Number(inc.amount), 0);

      const totalExpense = expenseList.reduce((sum, exp) => sum + Number(exp.amount), 0);
      const closingBalance = roundToTwo(totalIncome - totalExpense);

      // Daily interest
      let interestAmount = 0;
      if (closingBalance > 0 && ratePercent > 0) {
        interestAmount = roundToTwo((closingBalance * (ratePercent / 100)) / 365);
      }

      // Upsert into interest_days
      const { error: upsertDayError } = await supabase
        .from('interest_days')
        .upsert(
          {
            user_id: userId,
            interest_date: yesterdayKolkata,
            closing_balance: closingBalance,
            annual_rate_percent: ratePercent,
            interest_amount: interestAmount,
            account: 'Slice',
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,interest_date,account' }
        );

      if (upsertDayError) {
        console.error(`Error upserting interest_day for user ${userId}:`, upsertDayError);
        continue;
      }

      totalDaysProcessed++;

      // Recalculate monthly entry for yesterday's month
      const { data: monthDays, error: monthDaysError } = await supabase
        .from('interest_days')
        .select('interest_amount')
        .eq('user_id', userId)
        .gte('interest_date', `${yesterdayMonth}-01`)
        .lte('interest_date', yesterdayKolkata);

      if (!monthDaysError && monthDays) {
        const monthlySum = roundToTwo(monthDays.reduce((sum, d) => sum + Number(d.interest_amount), 0));
        const lastDayOfYesterdayMonth = getLastDayOfMonth(yesterdayMonth);
        const isLocked = yesterdayMonth < todayKolkata.slice(0, 7);
        const status = isLocked ? 'locked' : 'estimated';
        const description = getInterestDescription(yesterdayMonth);

        // Check if user manually edited entry
        const { data: existingEntry } = await supabase
          .from('user_income')
          .select('id, is_manually_edited')
          .eq('user_id', userId)
          .eq('is_auto_interest', true)
          .like('date', `${yesterdayMonth}%`)
          .maybeSingle();

        if (existingEntry && existingEntry.is_manually_edited) {
          // Do not overwrite manual edit
          console.log(`Skipping monthly entry update for ${yesterdayMonth} - marked manually edited`);
        } else if (existingEntry) {
          await supabase
            .from('user_income')
            .update({
              amount: monthlySum,
              auto_interest_status: status,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingEntry.id);
        } else {
          // Recreate or create entry
          await supabase
            .from('user_income')
            .insert({
              user_id: userId,
              source: 'Slice',
              category: 'Interest',
              notes: description,
              amount: monthlySum,
              date: lastDayOfYesterdayMonth,
              payment_method: 'UPI',
              is_auto_interest: true,
              auto_interest_status: status,
              wallet_target: 'saving',
            });
        }
      }
    }

    // Log successful run to interest_job_runs
    await supabase.from('interest_job_runs').insert({
      run_at: startTime.toISOString(),
      trigger,
      days_processed: totalDaysProcessed,
      status: 'ok',
      error_message: null,
    });

    return new Response(
      JSON.stringify({
        success: true,
        trigger,
        yesterdayProcessed: yesterdayKolkata,
        daysProcessed: totalDaysProcessed,
        timestamp: new Date().toISOString(),
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('Interest cron job failed:', err);

    // Attempt to log failure
    try {
      await supabase.from('interest_job_runs').insert({
        run_at: startTime.toISOString(),
        trigger,
        days_processed: 0,
        status: 'failed',
        error_message: err?.message || String(err),
      });
    } catch {
      // ignore
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: err?.message || String(err),
        timestamp: new Date().toISOString(),
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

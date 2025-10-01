<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { XMLParser } from 'fast-xml-parser';

import type { SingleAxisComponentOption, TooltipComponentOption } from 'echarts';
import { use as eChartUse } from 'echarts/core';
import { SVGRenderer } from 'echarts/renderers';
import { BarChart, LineChart } from 'echarts/charts';
import { GridComponent, TooltipComponent } from 'echarts/components';
import VChart from 'vue-echarts';

import { asArray, newInstance, parseEmacsString, toUnixSecs } from '@/lib/ledger';
import { useLedgeStore } from '@/stores/ledges';
import type { Account, CommodityQuantity, LedgerXML, Transaction } from '@/lib/types';

const store = useLedgeStore();
const status = ref(0);
const output = ref('');

const xmlParser = new XMLParser({
  attributeNamePrefix: '',
  ignoreAttributes: false,
});
const accounts = ref<Account[]>([]);
const xacts = ref<Transaction[]>([]);
const emacs = ref<{
  date: string;
  what: string;
  account: string;
  amount: string;
}[]>([]);
function toTable(xacts: readonly Transaction[]) {
  return xacts.flatMap(({ date, payee, postings }) => {
    const rows = asArray(postings.posting).map(({ account, 'post-amount': amount }) => {
      let amount1: CommodityQuantity;
      if (Array.isArray(amount.amount)) {
        amount1 = amount.amount[0];
      } else {
        amount1 = amount.amount!;
      }
      const amountText = `${
        amount1.commodity?.symbol ?? ''
      } ${isNaN(amount1.quantity) ? '' : amount1.quantity}`;
      return {
        date: '', what: '',
        account: account.name,
        amount: amountText,
      };
    });
    rows[0].date = new Date(toUnixSecs(date) * 1000).toISOString().substring(0, 10);
    rows[0].what = payee;
    return rows;
  });
}
async function update() {
  const { command, input } = store;
  const ledger = await newInstance();
  const result = ledger.run(
    command.split(/\s+/).filter((s) => !!s),
    input,
  );
  status.value = result.status;
  const text = result.stdout === '' ? result.stderr : result.stdout;
  emacs.value = [];
  if (text.startsWith('(')) {
    try {
      xacts.value = parseEmacsString(text);
      emacs.value = toTable(xacts.value);
    } catch (e) {
      console.log('unexpected non-sexpr', text, e);
    }
  } else if (text.startsWith('<')) {
    try {
      const parsed = xmlParser.parse(text) as LedgerXML;
      accounts.value = asArray(parsed.ledger.accounts.account);
      xacts.value = asArray(parsed.ledger.transactions.transaction);
      emacs.value = toTable(xacts.value);
    } catch (e) {
      console.log('unexpected xml', e);
    }
  }
  output.value = text;
}
watch(store, update);
update();

eChartUse([
  SVGRenderer,
  BarChart,
  LineChart,
  GridComponent,
  TooltipComponent,
]);
type ChartOpiton = InstanceType<typeof VChart>['$props']['option'];
const chartOption = computed<ChartOpiton>(() => {
  const series = xacts.value;
  series.forEach((posting) => posting.date = toUnixSecs(posting.date));
  const dates = [...new Set(series.map(({ date }) => date as number))].sort();
  const mapping = Object.fromEntries(dates.map((d, i) => [d, i]));
  const accounts: Record<string, number[]> = {};
  series.forEach(({ date, postings }) => asArray(postings.posting).forEach((posting) => {
    const { name: accName } = posting.account;
    asArray(posting.total?.amount ?? posting.total?.balance?.amount).forEach((total) => {
      const name = `${total.commodity?.symbol ?? ''}  ${accName}`;
      if (!accounts[name]) {
        accounts[name] = Array.from({ length: dates.length }).fill(0) as number[];
      }
      accounts[name][mapping[date]] += total.quantity;
    });
  }));
  return {
    xAxis: {
      type: 'category',
      data: dates.map((secs) => new Date(secs * 1000).toISOString().substring(0, 10)),
    } as SingleAxisComponentOption,
    yAxis: { type: 'value' } as SingleAxisComponentOption,
    series: Object.entries(accounts).map(([name, series]) => ({
      type: 'line',
      name,
      data: series,
    })),
    tooltip: {
      trigger: 'axis',
      formatter: (params_) => {
        const params = params_ as unknown as {
          axisValueLabel: string;
          data: number;
          marker: string;
          seriesName: string;
        }[];
        let output = params[0].axisValueLabel + '<br/>';
        output += '<table class="w-full">';
        params.reverse().forEach(function (param) {
          const value = param.data;
          if (value !== 0) {
            output += `<tr>
              <td>${param.marker}</td>
              <td>${param.seriesName}</td>
              <td class="text-right font-bold tabular-nums">${value}</td>
            </tr>`;
          }
        });

        return output + '</table>';
      },
    } as TooltipComponentOption,
  };
});
</script>

<template>
  <div>
    <v-form>
      <v-combobox label="Ledger Command" :items="store.bookmarks" v-model="store.command" />
      <v-textarea v-model="store.input" label="Standard Input (stdin)"
        auto-grow max-rows="20" style="font-family: monospace;"
        />
    </v-form>
    <v-card>
      <v-card-text>
        <v-chart v-show="emacs.length !== 0" :option="chartOption" autoresize
          style="min-height: 50vh;"
          />
        <v-data-table v-show="emacs.length !== 0" :items="emacs" />
        <pre>{{ output }}</pre>
      </v-card-text>
    </v-card>
  </div>
</template>

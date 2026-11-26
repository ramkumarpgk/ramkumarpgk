import { Pressable, StyleSheet, Text, View } from 'react-native';
import { dayKey, monthGrid, MONTH_FMT } from '../lib/dates';
import { colors } from '../lib/theme';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function MonthCalendar({
  month, selected, onSelect, onChangeMonth, dotsByDay,
}: {
  month: Date;
  selected: string;
  onSelect: (key: string) => void;
  onChangeMonth: (delta: number) => void;
  /** day key -> member colours with events that day */
  dotsByDay: Record<string, string[]>;
}) {
  const today = dayKey(new Date());
  const days = monthGrid(month);

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Pressable onPress={() => onChangeMonth(-1)} hitSlop={12} accessibilityLabel="Previous month">
          <Text style={styles.nav}>‹</Text>
        </Pressable>
        <Text style={styles.title}>{month.toLocaleDateString(undefined, MONTH_FMT)}</Text>
        <Pressable onPress={() => onChangeMonth(1)} hitSlop={12} accessibilityLabel="Next month">
          <Text style={styles.nav}>›</Text>
        </Pressable>
      </View>
      <View style={styles.row}>
        {WEEKDAYS.map((d, i) => (
          <Text key={i} style={styles.weekday}>{d}</Text>
        ))}
      </View>
      <View style={styles.grid}>
        {days.map((d) => {
          const key = dayKey(d);
          const inMonth = d.getMonth() === month.getMonth();
          const isSel = key === selected;
          const dots = [...new Set(dotsByDay[key] ?? [])].slice(0, 4);
          return (
            <Pressable key={key} style={styles.cell} onPress={() => onSelect(key)} accessibilityLabel={d.toDateString()}>
              <View style={[styles.dayCircle, isSel && { backgroundColor: colors.primary }, !isSel && key === today && styles.today]}>
                <Text style={[styles.dayText, !inMonth && { color: '#BCC0CF' }, isSel && { color: '#fff', fontWeight: '700' }]}>
                  {d.getDate()}
                </Text>
              </View>
              <View style={styles.dots}>
                {dots.map((c, i) => (
                  <View key={i} style={[styles.dot, { backgroundColor: c }]} />
                ))}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: colors.card, paddingHorizontal: 8, paddingBottom: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 10 },
  title: { fontSize: 18, fontWeight: '700', color: colors.text },
  nav: { fontSize: 30, color: colors.primary, paddingHorizontal: 8, lineHeight: 32 },
  row: { flexDirection: 'row' },
  weekday: { flex: 1, textAlign: 'center', color: colors.muted, fontSize: 12, fontWeight: '600', marginBottom: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, alignItems: 'center', paddingVertical: 3 },
  dayCircle: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  today: { borderWidth: 1.5, borderColor: colors.primary },
  dayText: { fontSize: 15, color: colors.text },
  dots: { flexDirection: 'row', gap: 2, height: 6, marginTop: 1 },
  dot: { width: 5, height: 5, borderRadius: 3 },
});

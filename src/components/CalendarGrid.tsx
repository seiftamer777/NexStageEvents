import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { AppColors } from '../constants/theme';
import { fontSizes, radius, spacing } from '../constants/theme';

export function fmtISODate(d: Date): string {
  return d.toISOString().split('T')[0];
}

const getToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

export function CalendarGrid({
  selectedDates,
  onToggle,
  availableDates,
  lockedDates,
  colors,
}: {
  selectedDates: string[];
  onToggle: (date: string) => void;
  availableDates?: string[];
  lockedDates?: string[];
  colors: AppColors;
}) {
  const TODAY = getToday();
  const todayStr = fmtISODate(TODAY);

  const [viewMonth, setViewMonth] = useState(() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (Date | null)[] = [
    ...Array(firstDayOfWeek).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const minMonth = new Date(TODAY.getFullYear(), TODAY.getMonth(), 1);
  const maxMonth = new Date(TODAY.getFullYear(), TODAY.getMonth() + 3, 1);
  const canPrev = viewMonth > minMonth;
  const canNext = viewMonth < maxMonth;
  const monthLabel = viewMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const s = makeCalStyles(colors);

  return (
    <View style={s.root}>
      {/* Month navigation */}
      <View style={s.header}>
        <TouchableOpacity
          style={[s.navBtn, !canPrev && s.navBtnOff]}
          onPress={() => canPrev && setViewMonth(new Date(year, month - 1, 1))}
          disabled={!canPrev}>
          <Ionicons name="chevron-back" size={18} color={canPrev ? colors.charcoal : colors.border} />
        </TouchableOpacity>
        <Text style={s.monthLabel}>{monthLabel}</Text>
        <TouchableOpacity
          style={[s.navBtn, !canNext && s.navBtnOff]}
          onPress={() => canNext && setViewMonth(new Date(year, month + 1, 1))}
          disabled={!canNext}>
          <Ionicons name="chevron-forward" size={18} color={canNext ? colors.charcoal : colors.border} />
        </TouchableOpacity>
      </View>

      {/* Weekday labels */}
      <View style={s.weekRow}>
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
          <Text key={d} style={s.weekLabel}>{d}</Text>
        ))}
      </View>

      {/* Day cells */}
      <View style={s.grid}>
        {cells.map((day, idx) => {
          if (!day) return <View key={`_${idx}`} style={s.cell} />;
          const str = fmtISODate(day);
          const isPast = day < TODAY;
          const isAvail =
            !availableDates?.length || availableDates.some((d) => d.startsWith(str));
          const isSelected = selectedDates.includes(str);
          const isLocked = !!lockedDates?.includes(str);
          const isToday = str === todayStr;
          const disabled = isPast || !isAvail;

          return (
            <TouchableOpacity
              key={str}
              style={[
                s.cell,
                isSelected && s.cellSel,
                isLocked && s.cellLocked,
                isToday && !isSelected && !isLocked && s.cellToday,
                disabled && !isSelected && s.cellDis,
              ]}
              onPress={() => { if (!disabled && !isLocked) onToggle(str); }}
              activeOpacity={disabled || isLocked ? 1 : 0.7}>
              <Text style={[
                s.cellTxt,
                isSelected && s.cellTxtSel,
                isLocked && s.cellTxtLocked,
                disabled && !isSelected && s.cellTxtDis,
              ]}>
                {day.getDate()}
              </Text>
              {isToday && !isSelected && !isLocked ? <View style={s.todayDot} /> : null}
              {isAvail && !isPast && !isSelected && !isLocked ? <View style={s.availDot} /> : null}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Legend */}
      <View style={s.legend}>
        <View style={s.legendItem}>
          <View style={[s.legendDot, { backgroundColor: colors.sage }]} />
          <Text style={s.legendTxt}>Available</Text>
        </View>
        <View style={s.legendItem}>
          <View style={[s.legendDot, { backgroundColor: colors.coral }]} />
          <Text style={s.legendTxt}>Selected</Text>
        </View>
        {(lockedDates?.length ?? 0) > 0 ? (
          <View style={s.legendItem}>
            <View style={[s.legendDot, { backgroundColor: `${colors.sage}50` }]} />
            <Text style={s.legendTxt}>Venue date</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function makeCalStyles(colors: AppColors) {
  return StyleSheet.create({
    root: { marginTop: spacing.sm },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.md,
    },
    navBtn: {
      width: 34, height: 34, borderRadius: radius.full,
      backgroundColor: colors.muted,
      alignItems: 'center', justifyContent: 'center',
    },
    navBtnOff: { opacity: 0.3 },
    monthLabel: {
      fontSize: fontSizes.base, fontWeight: '700', color: colors.charcoal,
    },
    weekRow: { flexDirection: 'row', marginBottom: 4 },
    weekLabel: {
      flex: 1, textAlign: 'center',
      fontSize: 11, fontWeight: '600', color: colors.mutedFg,
      paddingVertical: 4,
    },
    grid: { flexDirection: 'row', flexWrap: 'wrap' },
    cell: {
      width: '14.285714%',
      aspectRatio: 1,
      alignItems: 'center',
      justifyContent: 'center',
      marginVertical: 2,
    },
    cellSel: { backgroundColor: colors.coral, borderRadius: radius.full },
    cellLocked: { backgroundColor: `${colors.sage}25`, borderRadius: radius.full },
    cellToday: { borderWidth: 1.5, borderColor: colors.coral, borderRadius: radius.full },
    cellDis: { opacity: 0.25 },
    cellTxt: { fontSize: fontSizes.sm, fontWeight: '600', color: colors.charcoal },
    cellTxtSel: { color: colors.white },
    cellTxtLocked: { color: colors.sage },
    cellTxtDis: { color: colors.border },
    todayDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: colors.coral, marginTop: 1 },
    availDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: colors.sage, marginTop: 1 },
    legend: {
      flexDirection: 'row',
      gap: spacing.lg,
      marginTop: spacing.md,
      justifyContent: 'flex-end',
    },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    legendDot: { width: 7, height: 7, borderRadius: 4 },
    legendTxt: { fontSize: 10, color: colors.mutedFg, fontWeight: '500' },
  });
}

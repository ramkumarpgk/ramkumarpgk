import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../lib/theme';

/**
 * iOS: compact native picker inline.
 * Android: tappable text that opens the native date/time dialog.
 */
export function DateField({ value, onChange, mode }: { value: Date; onChange: (d: Date) => void; mode: 'date' | 'time' }) {
  const [open, setOpen] = useState(false);

  if (Platform.OS === 'ios') {
    return (
      <DateTimePicker
        value={value}
        mode={mode}
        display="compact"
        minuteInterval={5}
        onValueChange={(_, d) => d && onChange(d)}
      />
    );
  }

  const text =
    mode === 'date'
      ? value.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
      : value.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

  return (
    <View>
      <Pressable onPress={() => setOpen(true)} style={styles.box} accessibilityRole="button">
        <Text style={styles.text}>{text}</Text>
      </Pressable>
      {open && (
        <DateTimePicker
          value={value}
          mode={mode}
          onValueChange={(_, d) => {
            setOpen(false);
            if (d) onChange(d);
          }}
          onDismiss={() => setOpen(false)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { backgroundColor: '#EEF0FA', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  text: { fontSize: 16, color: colors.text },
});

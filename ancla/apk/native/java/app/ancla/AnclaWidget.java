package app.ancla;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.view.View;
import android.widget.RemoteViews;

// Widget de pantalla de inicio: muestra hasta 5 post-its pendientes. Tocarlo abre Ancla.
public class AnclaWidget extends AppWidgetProvider {
    static final String PREFS = "ancla_widget";
    static final int[] SLOTS = {R.id.n1, R.id.n2, R.id.n3, R.id.n4, R.id.n5};

    @Override
    public void onUpdate(Context c, AppWidgetManager m, int[] ids) {
        for (int id : ids) m.updateAppWidget(id, build(c));
    }

    static void refresh(Context c) {
        AppWidgetManager m = AppWidgetManager.getInstance(c);
        int[] ids = m.getAppWidgetIds(new ComponentName(c, AnclaWidget.class));
        for (int id : ids) m.updateAppWidget(id, build(c));
    }

    static int bg(String color) {
        switch (color) {
            case "rosa": return R.drawable.pi_rosa;
            case "verde": return R.drawable.pi_verde;
            case "azul": return R.drawable.pi_azul;
            case "naranja": return R.drawable.pi_naranja;
            default: return R.drawable.pi_amarillo;
        }
    }

    static RemoteViews build(Context c) {
        RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.ancla_widget);
        String raw = c.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString("items", "");
        String[] items = raw.isEmpty() ? new String[0] : raw.split("\n");
        for (int i = 0; i < SLOTS.length; i++) {
            if (i < items.length) {
                String[] parts = items[i].split("\\|", 2);
                v.setTextViewText(SLOTS[i], parts.length > 1 ? parts[1] : parts[0]);
                v.setInt(SLOTS[i], "setBackgroundResource", bg(parts[0]));
                v.setViewVisibility(SLOTS[i], View.VISIBLE);
            } else {
                v.setViewVisibility(SLOTS[i], View.GONE);
            }
        }
        v.setViewVisibility(R.id.empty, items.length == 0 ? View.VISIBLE : View.GONE);
        int extra = items.length - SLOTS.length;
        v.setTextViewText(R.id.more, extra > 0 ? "+" + extra + " más en la pizarra" : "");
        v.setViewVisibility(R.id.more, extra > 0 ? View.VISIBLE : View.GONE);
        Intent open = new Intent(c, MainActivity.class);
        open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pi = PendingIntent.getActivity(c, 0, open, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        v.setOnClickPendingIntent(R.id.root, pi);
        return v;
    }
}

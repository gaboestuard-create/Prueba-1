package app.ancla;

import android.content.Context;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

// La app web llama AnclaWidget.update({items}) cada vez que cambian los pendientes.
@CapacitorPlugin(name = "AnclaWidget")
public class AnclaWidgetPlugin extends Plugin {
    @PluginMethod
    public void update(PluginCall call) {
        String items = call.getString("items", "");
        Context c = getContext();
        c.getSharedPreferences(AnclaWidget.PREFS, Context.MODE_PRIVATE).edit().putString("items", items).apply();
        AnclaWidget.refresh(c);
        call.resolve();
    }
}

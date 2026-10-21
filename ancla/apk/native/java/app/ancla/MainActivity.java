package app.ancla;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(AnclaWidgetPlugin.class);
        super.onCreate(savedInstanceState);
    }
}

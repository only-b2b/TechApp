# List of files to update
$files = @(
    "App.js",
    "screens/DashboardScreen.js",
    "screens/WorkScreen.js",
    "screens/WalletScreen.js",
    "screens/ProfileScreen.js",
    "screens/RequestDetailScreen.js",
    "screens/ActiveRideScreen.js",
    "screens/ActiveWashScreen.js",
    "screens/tabs/PendingRequestsTab.js",
    "screens/tabs/AcceptedRequestsTab.js"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        $content = Get-Content $file -Raw
        
        # Replace import
        $content = $content -replace 'import \{ Ionicons \} from "@expo/vector-icons";', 'import Icon from "react-native-vector-icons/Ionicons";'
        
        # Replace usage (simple cases)
        $content = $content -replace '<Ionicons ', '<Icon '
        $content = $content -replace '</Ionicons>', '</Icon>'
        
        Set-Content $file $content
        Write-Host "✅ Fixed: $file"
    }
}
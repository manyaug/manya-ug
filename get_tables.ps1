$data = Get-Content "d:\manya_app\db-schema.txt" | ConvertFrom-Json
$tables = $data | Where-Object { $_.schema -eq "public" } | Select-Object -ExpandProperty table_name | Sort-Object | Get-Unique
$tables | Out-File -FilePath "d:\manya_app\table_list.txt" -Encoding utf8

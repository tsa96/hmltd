for i in *bios.txt
do 
  sed -e 's/ /\n/g' "$i" > "$(echo "$i" | cut -d_ -f1)".txt 
done
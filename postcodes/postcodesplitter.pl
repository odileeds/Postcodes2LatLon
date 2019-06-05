#!/usr/bin/perl
# Split the Postcode lookup into a single geography

@categories = @ARGV;
if(!@categories){ @categories = ("lat","long"); }

$file = "National_Statistics_Postcode_Lookup_Latest_Centroids.csv";

if(!-e $file){
	print "The National Statistics Postcode Lookup doesn't seem to exist. Please download a copy from:\n";
	print "http://geoportal.statistics.gov.uk/datasets/national-statistics-postcode-lookup-latest-centroids\n";
	print "And save it as $file\n";
	exit;
}

open(FILE,"National_Statistics_Postcode_Lookup_Latest_Centroids.csv");
#X,Y,objectid,pcd,pcd2,pcds,dointr,doterm,usertype,oseast1m,osnrth1m,osgrdind,oa11,cty,laua,ward,hlthau,ctry,pcon,eer,teclec,ttwa,pct,nuts,park,lsoa11,msoa11,wz11,ccg,bua11,buasd11,ru11ind,oac11,lat,long,lep1,lep2,pfa,imd,ced,nhser,rgn,calncv,stp
$pcd = -1;
@cat;
for($c = 0; $c < @categories; $c++){ $cat[$c] = -1; }

open(FILE,$file);
$counter = 0;
%pcs;

# Regex for postcodes ([Gg][Ii][Rr] 0[Aa]{2})|((([A-Za-z][0-9]{1,2})|(([A-Za-z][A-Ha-hJ-Yj-y][0-9]{1,2})|(([A-Za-z][0-9][A-Za-z])|([A-Za-z][A-Ha-hJ-Yj-y][0-9][A-Za-z]?))))\s?[0-9][A-Za-z]{2})

while(my $line = <FILE>){

	(@cols) = split(/,/,$line);
	
	if(!$header){
		$header = $line;
		@headers = @cols;
		for($i = 0; $i < @headers; $i++){
			if($headers[$i] eq "pcd"){ $pcd = $i; }
			for($c = 0; $c < @categories; $c++){
				if($headers[$i] eq $categories[$c]){ $cat[$c] = $i; }
			}
		}
	}else{
	
		$cols[3] =~ s/ +/ /g;
		if($cols[3] =~ /^([A-Z]{1,2})[0-9]/){
			$bit = $1;
		}
		if($bit){
			if(!$pcs{$bit}){
				$pcs{$bit} = 0;
			}
			if($pcs{$bit} == 0){
				open(CSV,">",$bit.".csv");
				print CSV "Postcode";
				for($c = 0; $c < @categories; $c++){
					print CSV ",$categories[$c]";
				}
				print CSV "\n";
			}else{
				# If the start of the postcode is different, we close the file we have open
				if($bit ne $lastbit && $lastbit){
					print "Change from $lastbit to $bit ($pcs{$lastbit})\n";
					close(CSV);
					open(CSV,">>",$bit.".csv");

				}
			}

			print CSV $cols[3];
			
			for($c = 0; $c < @categories; $c++){
				print CSV ",";
				if($categories[$c] eq "lat"){
					$cols[$cat[$c]] =~ s/([0-9]\.[0-9]{5})[0-9]*/$1/g;
					if($cols[$cat[$c]] > 90){
						$cols[$cat[$c]] = "";
					}
				}
				if($categories[$c] eq "long"){
					$cols[$cat[$c]] =~ s/([0-9]\.[0-9]{5})[0-9]*/$1/g;
				}
				print CSV "$cols[$cat[$c]]";
			}
			print CSV "\n";
			$pcs{$bit}++;
			$lastbit = $bit;
		}
	}
}
close(FILE);

#!/usr/bin/perl
# Split the Postcode lookup into a single geography

use Data::Dumper;

@categories = @ARGV;
if(!@categories){ @categories = ("lat","long"); }

$file = "../../../Geography/NSPL/NSPL_MAY_2025/Data/NSPL_MAY_2025_UK.csv";

if(!-e $file){
	print "The National Statistics Postcode Lookup doesn't seem to exist. Please download a copy from e.g.:\n";
	print "https://geoportal.statistics.gov.uk/datasets/077631e063eb4e1ab43575d01381ec33/about\n";
	print "And save it as $file\n";
	exit;
}

$pcd = -1;
@cat;
for($c = 0; $c < @categories; $c++){ $cat[$c] = -1; }

#pcd,pcd2,pcds,dointr,doterm,usertype,oseast1m,osnrth1m,osgrdind,oa21,cty,ced,laua,ward,nhser,ctry,rgn,pcon,ttwa,itl,park,lsoa21,msoa21,wz11,sicbl,bua24,ruc21,oac11,lat,long,lep1,lep2,pfa,imd,icb
open(FILE,$file);
$counter = 0;
%pcs;

# Regex for postcodes ([Gg][Ii][Rr] 0[Aa]{2})|((([A-Za-z][0-9]{1,2})|(([A-Za-z][A-Ha-hJ-Yj-y][0-9]{1,2})|(([A-Za-z][0-9][A-Za-z])|([A-Za-z][A-Ha-hJ-Yj-y][0-9][A-Za-z]?))))\s?[0-9][A-Za-z]{2})
%headerlookup;
while(my $line = <FILE>){

	$line =~ s/\"//g;
	(@cols) = split(/,/,$line);
	
	if(!$header){
		$header = $line;
		@headers = @cols;
		for($i = 0; $i < @headers; $i++){
			$headerlookup{$headers[$i]} = $i;
			if($headers[$i] eq "pcd"){ $pcd = $i; }
			for($c = 0; $c < @categories; $c++){
				if($headers[$i] eq $categories[$c]){ $cat[$c] = $i; }
			}
		}

	}else{
	
		$cols[$headerlookup{'pcd'}] =~ s/ +/ /g;
		if($cols[$headerlookup{'pcd'}] =~ /^([A-Z]{1,2})[0-9]/){
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

			print CSV $cols[$headerlookup{'pcd'}];
			
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

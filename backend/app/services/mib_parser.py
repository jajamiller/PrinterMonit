"""
MIB database builder - parses LibreNMS MIBs and creates a local OID database.
"""
import json
import os
import re
from pathlib import Path
from typing import Dict, List, Optional


class MIBParser:
    """Parses SNMP MIB files to extract OIDs for printer page counters."""
    
    def __init__(self, mibs_dir: str):
        self.mibs_dir = Path(mibs_dir)
        self.oids_db: Dict[str, List[str]] = {}
    
    def parse_brother_mib(self, mib_file: Path) -> Optional[List[str]]:
        """Extract page counter OID from Brother MIB."""
        try:
            with open(mib_file, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
            
            # Brother uses: brPrintPages = 1.3.6.1.4.1.2435.5.5.52.1.1.3
            if 'brPrintPages' in content and '2435' in content:
                return ['1.3.6.1.4.1.2435.5.5.52.1.1.3']
            
            return None
        except Exception as e:
            print(f"Error parsing Brother MIB: {e}")
            return None
    
    def parse_generic_printer_mib(self, mib_file: Path) -> Optional[List[str]]:
        """Extract page counter OID from generic Printer MIB (RFC 3805)."""
        try:
            with open(mib_file, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
            
            # Look for common patterns in printer MIBs
            oids = []
            
            # RFC 3805 standard OIDs
            if 'prtMarkerLifeCount' in content or 'Printer-MIB' in content:
                # prtMarker table (1.3.6.1.2.1.43.10)
                oids.extend([
                    '1.3.6.1.2.1.43.10.2.1.4.1.1',  # prtMarkerLifeCount for first marker
                ])
            
            return oids if oids else None
        except Exception as e:
            print(f"Error parsing generic Printer MIB: {e}")
            return None
    
    def discover_oids_from_folder(self, folder: Path, manufacturer: str) -> Optional[List[str]]:
        """Try to discover OIDs from all MIBs in a folder."""
        try:
            mib_files = list(folder.glob('*'))
            if not mib_files:
                return None
            
            # Try to read and find OID patterns
            for mib_file in mib_files[:5]:  # Check first 5 files
                try:
                    with open(mib_file, 'r', encoding='utf-8', errors='ignore') as f:
                        content = f.read()
                    
                    # Look for enterprise OID patterns
                    # enterprises X.X.X pattern
                    patterns = re.findall(r'enterprises[,\s]+(\d+)', content)
                    if patterns:
                        oid_base = f"1.3.6.1.4.1.{patterns[0]}"
                        return [oid_base]  # Return base for now
                
                except:
                    continue
            
            return None
        except Exception:
            return None
    
    def build_database(self) -> Dict[str, List[str]]:
        """Build OID database from LibreNMS MIBs."""
        oids_db = {}
        
        if not self.mibs_dir.exists():
            print(f"MIBs directory not found: {self.mibs_dir}")
            return self._get_default_oids()
        
        # Brother
        brother_dir = self.mibs_dir / 'brother'
        if brother_dir.exists():
            brother_oids = self.parse_brother_mib(brother_dir / 'BROTHER-MIB')
            if brother_oids:
                oids_db['brother'] = brother_oids
        
        # Generic Printer MIB (RFC 3805)
        printer_mib = self.mibs_dir / 'Printer-MIB'
        if printer_mib.exists():
            generic_oids = self.parse_generic_printer_mib(printer_mib)
            if generic_oids:
                oids_db['generic'] = generic_oids
        
        # Try to discover more manufacturers
        for mib_folder in self.mibs_dir.iterdir():
            if mib_folder.is_dir() and not mib_folder.name.startswith('.'):
                manufacturer = mib_folder.name.lower()
                if manufacturer not in oids_db:
                    discovered = self.discover_oids_from_folder(mib_folder, manufacturer)
                    if discovered:
                        oids_db[manufacturer] = discovered
        
        # Add defaults if empty
        if not oids_db:
            oids_db = self._get_default_oids()
        
        return oids_db
    
    def _get_default_oids(self) -> Dict[str, List[str]]:
        """Return hardcoded default OIDs for common manufacturers."""
        return {
            'brother': ['1.3.6.1.4.1.2435.5.5.52.1.1.3'],
            'hp': ['1.3.6.1.4.1.11.2.3.9.4.2.1.3.0'],
            'xerox': ['1.3.6.1.4.1.253.8.53.3.2.1.1.1'],
            'canon': ['1.3.6.1.4.1.1602.1.11.2.3.6.1.2.1'],
            'ricoh': ['1.3.6.1.4.1.367.3.2.1.2.24.1.3.5.0'],
            'kyocera': ['1.3.6.1.4.1.874.101.1.1.34.1.0'],
            'lexmark': ['1.3.6.1.4.1.641.2.1.2.1.9.0', '1.3.6.1.4.1.641.2.1.2.2.1.5.1.0'],
            'epson': ['1.3.6.1.4.1.1248.1.2.2.12.1.2.1.1.0'],
            'toshiba': ['1.3.6.1.4.1.1164.1.1.2.1.6.1'],
            'samsung': ['1.3.6.1.4.1.236.11.5.11.1.1.6.1.1'],
            'oki': ['1.3.6.1.4.1.2001.1.1.1.1.1'],
            'generic': [
                '1.3.6.1.2.1.43.10.2.1.4.1.1',  # RFC 3805 prtMarkerLifeCount
                '1.3.6.1.2.1.43.5.1.1.4.1.1',   # Total impressions
                '1.3.6.1.2.1.43.5.1.1.4.2',     # Printer page counter
            ]
        }


def save_oids_database(oids_db: Dict[str, List[str]], output_file: str):
    """Save OID database to JSON file."""
    os.makedirs(os.path.dirname(output_file) if os.path.dirname(output_file) else '.', exist_ok=True)
    with open(output_file, 'w') as f:
        json.dump(oids_db, f, indent=2)
    print(f"✅ OID database saved to {output_file}")
    print(f"   Manufacturers: {len(oids_db)}")
    for manufacturer, oids in sorted(oids_db.items()):
        print(f"   - {manufacturer}: {len(oids)} OID(s)")


def load_oids_database(db_file: str) -> Dict[str, List[str]]:
    """Load OID database from JSON file."""
    try:
        with open(db_file, 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"⚠️  OID database not found: {db_file}")
        print("   Using default OIDs")
        parser = MIBParser('')
        return parser._get_default_oids()


if __name__ == '__main__':
    # Example usage
    mibs_path = '/tmp/opencode/librenms/mibs'
    output_path = '/root/savepage/backend/app/data/printer_oids.json'
    
    print(f"📚 Parsing MIBs from: {mibs_path}")
    parser = MIBParser(mibs_path)
    oids_db = parser.build_database()
    
    print(f"\n✨ Found OIDs for {len(oids_db)} manufacturers:")
    for mfr, oids in sorted(oids_db.items()):
        print(f"  - {mfr}: {oids}")
    
    save_oids_database(oids_db, output_path)

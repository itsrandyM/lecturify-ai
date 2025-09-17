import { useState } from 'react';
import { Plus, Edit2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Unit } from '@/hooks/useRecorder';

interface UnitsFilterProps {
  units: Unit[];
  selectedUnit: string | null;
  onUnitSelect: (unitId: string | null) => void;
  onCreateUnit: (name: string) => Promise<Unit | undefined>;
}

export const UnitsFilter = ({ 
  units, 
  selectedUnit, 
  onUnitSelect, 
  onCreateUnit 
}: UnitsFilterProps) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newUnitName, setNewUnitName] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);

  const handleCreateUnit = async () => {
    if (!newUnitName.trim()) return;
    
    const unit = await onCreateUnit(newUnitName.trim());
    if (unit) {
      setNewUnitName('');
      setIsCreating(false);
    }
  };

  const getNextUnitNumber = () => {
    const unitNumbers = units
      .map(u => u.name.match(/Unit (\d+)/)?.[1])
      .filter(Boolean)
      .map(Number)
      .sort((a, b) => a - b);
    
    let nextNumber = 1;
    for (const num of unitNumbers) {
      if (num === nextNumber) {
        nextNumber++;
      } else {
        break;
      }
    }
    return nextNumber;
  };

  const suggestUnitName = () => {
    const nextNumber = getNextUnitNumber();
    setNewUnitName(`Unit ${nextNumber}`);
    setIsEditingName(true);
  };

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
      <div className="flex items-center gap-2 flex-1">
        <Select value={selectedUnit || 'all'} onValueChange={(value) => onUnitSelect(value === 'all' ? null : value)}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Filter by unit" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Units</SelectItem>
            {units.map((unit) => (
              <SelectItem key={unit.id} value={unit.id}>
                {unit.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        {!isCreating ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setIsCreating(true);
              suggestUnitName();
            }}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            New Unit
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <Input
                value={newUnitName}
                onChange={(e) => setNewUnitName(e.target.value)}
                placeholder="Unit name"
                className="w-32"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCreateUnit();
                  } else if (e.key === 'Escape') {
                    setIsCreating(false);
                    setNewUnitName('');
                    setIsEditingName(false);
                  }
                }}
                autoFocus
              />
              {!isEditingName && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditingName(true)}
                >
                  <Edit2 className="h-3 w-3" />
                </Button>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCreateUnit}
              disabled={!newUnitName.trim()}
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsCreating(false);
                setNewUnitName('');
                setIsEditingName(false);
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
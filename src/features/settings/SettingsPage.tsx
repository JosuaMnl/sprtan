import { Link } from 'react-router-dom'
import { PageHeader } from '../../components/layout/PageHeader'
import { Card } from '../../components/ui/primitives'
import { useUnit } from '../../settings/UnitContext'
import type { WeightUnit } from '../../lib/units'
import './settings.css'

const UNITS: { value: WeightUnit; label: string; hint: string }[] = [
  { value: 'kg', label: 'Kilogram', hint: 'kg' },
  { value: 'lbs', label: 'Pound', hint: 'lbs' },
]

export function SettingsPage() {
  const { unit, setUnit } = useUnit()

  return (
    <div>
      <PageHeader eyebrow="ΤΑΞΙΣ" title="Pengaturan" />

      <Card className="setting-card">
        <div className="setting-row">
          <div className="setting-row__text">
            <h2 className="setting-row__title">Satuan Berat</h2>
            <p className="setting-row__desc">
              Semua data disimpan konsisten — mengganti satuan hanya mengubah
              tampilan, tidak menyentuh angka aslimu.
            </p>
          </div>
          <div className="unit-toggle" role="radiogroup" aria-label="Satuan berat">
            {UNITS.map((u) => (
              <button
                key={u.value}
                role="radio"
                aria-checked={unit === u.value}
                className={`unit-toggle__opt ${unit === u.value ? 'is-active' : ''}`}
                onClick={() => setUnit(u.value)}
              >
                <span className="unit-toggle__label">{u.label}</span>
                <span className="unit-toggle__hint num">{u.hint}</span>
              </button>
            ))}
          </div>
        </div>
      </Card>

      <Card className="setting-card">
        <div className="setting-row">
          <div className="setting-row__text">
            <h2 className="setting-row__title">Privasi &amp; Data</h2>
            <p className="setting-row__desc">
              Datamu disimpan lokal di perangkat ini. Baca cara Sprtan menangani
              data, lokasi, dan iklan.
            </p>
          </div>
          <Link to="/privasi" className="setting-link">
            Kebijakan Privasi →
          </Link>
        </div>
      </Card>

      <p className="setting-foot">
        Konversi: 1 kg = 2,2046 lbs. Sprtan menyimpan berat dalam kilogram dan
        mengonversi ke satuan pilihanmu saat menampilkan.
      </p>
    </div>
  )
}

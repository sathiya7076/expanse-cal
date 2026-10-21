import { FiAlertCircle, FiCheckCircle, FiHelpCircle } from 'react-icons/fi';

/** Text plus icon, so meaning never depends on colour alone. */
export default function ConfidenceBadge({ value, missing }) {
  if (missing) {
    return (
      <span className="inline-flex items-center gap-1 font-medium text-warn">
        <FiAlertCircle aria-hidden="true" /> Not found, please fill in
      </span>
    );
  }
  if (typeof value !== 'number') return null;
  if (value >= 0.8) {
    return <span className="inline-flex items-center gap-1 text-income"><FiCheckCircle aria-hidden="true" /> High confidence</span>;
  }
  if (value >= 0.5) {
    return <span className="inline-flex items-center gap-1 text-warn"><FiHelpCircle aria-hidden="true" /> Check this value</span>;
  }
  return <span className="inline-flex items-center gap-1 font-medium text-expense"><FiAlertCircle aria-hidden="true" /> Low confidence, review</span>;
}
